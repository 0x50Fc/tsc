#ifndef _KK_H
#define _KK_H

#include <string>
#include <map>
#include <list>
#include <set>

namespace kk
{

typedef int Int;
typedef int Int32;
typedef long long Int64;
typedef unsigned int Uint;
typedef unsigned int Uint32;
typedef unsigned long long Uint64;
typedef double Number;
typedef bool Boolean;
typedef void *Func;
class Closure;
class IObject;
class Object;
class String;
class Any;

class Atomic
{
  public:
    virtual void lock() = 0;
    virtual void unlock() = 0;
    virtual void addObject(IObject *object) = 0;
};

extern Atomic *atomic();

class IObject
{
  public:
    virtual void release() = 0;
    virtual void retain() = 0;
    virtual int retainCount() = 0;
    virtual void weak(IObject **p) = 0;
    virtual void unWeak(IObject **p) = 0;
};

class _Object : public IObject
{
  public:
    _Object();
    virtual void release() = 0;
    virtual void retain() = 0;
    virtual int retainCount() = 0;
    virtual void weak(IObject **p) = 0;
    virtual void unWeak(IObject **p) = 0;

  private:
    int _retainCount;
    std::set<IObject **> _weakObjects;
};

class Scope
{
  public:
    Scope();
    virtual ~Scope();
    virtual Scope *parent();
    virtual void addObject(IObject * object);
    static Scope *current();

  protected:
    Scope *_parent;
    std::list<IObject *> _objects;
};

class _Ref
{
  public:
    _Ref();
    _Ref(IObject *object);
    virtual IObject *get();
    virtual void set(IObject *object) = 0;

  protected:
    IObject *_object;
};

class _Weak : public _Ref
{
  public:
    _Weak();
    _Weak(IObject *object);
    virtual void set(IObject *object);
};

class _Strong : public _Ref
{
  public:
    _Strong();
    _Strong(IObject *object);
    virtual void set(IObject *object);
};

class Object : public _Object
{
};

class String : public std::string
{
  public:
    String(){};
    String(const char *v);
    String(const String &v);
    String &operator=(const char *v);
    String &operator=(Boolean v);
    String &operator=(Number v);
    String &operator=(IObject *v);
};

enum Type
{
    TypeNil,
    TypeString,
    TypeNumber,
    TypeBoolean,
    TypeFunction,
    TypeObject
};

class Any
{
  public:
    Any();
    Any(const Any &v);

    virtual String &stringValue();
    virtual Object *objectValue();
    template <typename T>
    T funcValue()
    {
        if (_type == TypeFunction)
        {
            return (T)_functionValue.func();
        }
        return nullptr;
    }
    virtual Number numberValue();
    virtual Boolean booleanValue();

    virtual bool operator!=(IObject *b);
    virtual bool operator==(IObject *b);
    virtual Any &operator=(kk::String &v);

    virtual operator kk::Func();
    virtual operator kk::Int&();

  protected:
    Type _type;
    String _stringValue;
    union {
        IObject *_objectValue;
        Number _numberValue;
        Boolean _booleanValue;
        Int _intValue;
        Uint _uintValue;
    };
};

class _Closure : public Object
{
  public:
    _Closure();
    _Closure(Func func,...);
    virtual Any &get(const char *name);
  protected:
    Func _func;
    std::map<std::string,Any> _values;
};

template <typename TKey, typename TValue>
class TObject : public Object
{
  public:
    TObject() {}
    TObject(const TObject &v)
    {
        _objects = v->_objects;
    }
    TValue &operator[](TKey key)
    {
        return _objects[key];
    }
    TObject &operator=(const TObject &v)
    {
        _objects = v->_objects;
        return *this;
    }

  protected:
    std::map<TKey, TValue> _objects;
};

template <typename T, typename... TArg>
class Closure : public _Closure
{
  public:
    Closure() : _Closure() {}
    Closure(T(*func(Closure *, TArg...)),...) : _Closure((Func)func,...) {}
    Closure(const Closure &v) { _func = v._func; _values = v._values; }
};

template <class T = IObject>
class Strong : public _Strong
{
  public:
    Strong() : _Strong() {}
    Strong(T object) : _Strong(object) {}
    Strong(const Strong &ref) : _Strong(ref.get()) {}
    virtual T as()
    {
        return (T)get();
    }
    virtual Strong &operator=(T object)
    {
        set(object);
        return *this;
    }
    virtual Strong &operator=(const Strong &ref)
    {
        set(ref.get());
        return *this;
    }
    virtual operator T()
    {
        return (T)get();
    }
};

template <class T = IObject>
class Weak : public _Weak
{
  public:
    Weak() : _Weak() {}
    Weak(T object) : _Weak(object) {}
    Weak(const Weak &ref) : _Weak(ref.get()) {}
    virtual T as()
    {
        return (T)get();
    }
    virtual Weak &operator=(T object)
    {
        set(object);
        return *this;
    }
    virtual Weak &operator=(const Weak &ref)
    {
        set(ref.get());
        return *this;
    }
    virtual operator T()
    {
        return (T)get();
    }
};

} // namespace kk

#endif
