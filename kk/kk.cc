
#include "kk.h"
#include <pthread.h>

namespace kk
{

_Object::_Object() : _retainCount(0)
{
}

_Object::~_Object()
{

    Atomic *a = atomic();

    if (a != nullptr)
    {
        a->lock();
    }

    std::set<IObject **>::iterator i = _weakObjects.begin();

    while (i != _weakObjects.end())
    {
        IObject **v = *i;
        if (v)
        {
            *v = NULL;
        }
        i++;
    }

    if (a != nullptr)
    {
        a->unlock();
    }
}

void _Object::release()
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    _retainCount--;
    if (_retainCount == 0)
    {
        if (a != nullptr)
        {
            a->addObject(this);
        }
        else
        {
            delete this;
        }
    }
    if (a != nullptr)
    {
        a->unlock();
    }
}

void _Object::retain()
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    _retainCount++;
    if (a != nullptr)
    {
        a->unlock();
    }
}

int _Object::retainCount()
{
    return _retainCount;
}

void _Object::weak(IObject **ptr)
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    _weakObjects.insert(ptr);
    if (a != nullptr)
    {
        a->unlock();
    }
}

void _Object::unWeak(IObject **ptr)
{
    Atomic *a = atomic();
    if (a != nullptr)
    {
        a->lock();
    }
    std::set<IObject **>::iterator i = _weakObjects.find(ptr);
    if (i != _weakObjects.end())
    {
        _weakObjects.erase(i);
    }
    if (a != nullptr)
    {
        a->unlock();
    }
}

static pthread_key_t kScopeCurrent = 0;

Scope::Scope() : _parent(Scope::current())
{
    pthread_setspecific(kScopeCurrent, this);
}

Scope::~Scope()
{
    pthread_setspecific(kScopeCurrent, _parent);

    std::list<IObject *>::iterator i = _objects.begin();

    while (i != _objects.end())
    {
        IObject *v = *i;
        v->release();
        i++;
    }
}

Scope *Scope::parent()
{
    return _parent;
}

void Scope::addObject(IObject *object)
{
    _objects.push_back(object);
    object->retain();
}

Scope *Scope::current()
{
    static pthread_key_t v = 0;
    if (v == 0)
    {
        pthread_key_create(&v, nullptr);
    }
    return (Scope *)pthread_getspecific(v);
}

_Ref::_Ref() : _object(nullptr)
{
}

_Ref::_Ref(IObject *object) : _object(nullptr)
{
    set(object);
}

IObject *_Ref::get()
{
    return _object;
}

_Weak::_Weak() : _Ref()
{
}

_Weak::_Weak(IObject *object) : _Ref(object)
{

}

void _Weak::set(IObject *object)
{
    if (_object != nullptr)
    {
        _object->unWeak(&_object);
    }
    if (object != nullptr)
    {
        object->weak(&_object);
    }
    _object = object;
}

_Strong::_Strong() : _Ref()
{
}

_Strong::_Strong(IObject *object) : _Ref(object)
{
}

void _Strong::set(IObject *object)
{
    if (object != nullptr)
    {
        object->retain();
    }
    if (_object != nullptr)
    {
        _object->release();
    }
    _object = object;
}

class MutexAtomic : public Atomic
{
  public:
    MutexAtomic()
    {
        pthread_mutex_init(&_lock, nullptr);
        pthread_mutex_init(&_objectLock, nullptr);
    }

    virtual ~MutexAtomic()
    {
        pthread_mutex_destroy(&_lock);
        pthread_mutex_destroy(&_objectLock);
    }

    virtual void lock()
    {
        pthread_mutex_lock(&_lock);
    }

    virtual void unlock()
    {
        pthread_mutex_unlock(&_lock);

        Object *v = nullptr;

        do
        {

            pthread_mutex_lock(&_objectLock);

            if (_objects.empty())
            {
                v = nullptr;
            }
            else
            {
                v = _objects.front();
                _objects.pop();
            }

            pthread_mutex_unlock(&_objectLock);

            if (v != nullptr && v->retainCount() == 0)
            {
                delete v;
            }

        } while (v);
    }

    virtual void addObject(Object *object)
    {
        pthread_mutex_lock(&_objectLock);
        _objects.push(object);
        pthread_mutex_unlock(&_objectLock);
    }

  private:
    pthread_mutex_t _lock;
    pthread_mutex_t _objectLock;
    std::queue<Object *> _objects;
};

Atomic *atomic()
{

    static Atomic *a = nullptr;

    if (a == nullptr)
    {
        a = new MutexAtomic();
    }

    return a;
}

} // namespace kk
