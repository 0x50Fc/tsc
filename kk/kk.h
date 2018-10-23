#ifndef _KK_H
#define _KK_H

#include <string>
#include <map>
#include <list>
#include <set>
#include <vector>

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
class _Closure;
class Object;
class String;
class Any;

class IObject
{
  public:
    virtual void release() = 0;
    virtual void retain() = 0;
    virtual int retainCount() = 0;
    virtual void weak(IObject **p) = 0;
    virtual void unWeak(IObject **p) = 0;
};

class Atomic
{
  public:
    virtual void lock() = 0;
    virtual void unlock() = 0;
    virtual void addObject(IObject *object) = 0;
};

extern Atomic *atomic();

class _Object : public IObject
{
  public:
    _Object();
    virtual ~_Object();
    virtual void release();
    virtual void retain();
    virtual int retainCount();
    virtual void weak(IObject **p);
    virtual void unWeak(IObject **p);

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
    virtual void addObject(IObject *object);
    static Scope *current();

  protected:
    Scope *_parent;
    std::list<IObject *> _objects;
};

class _Ref
{
  public:
    _Ref();
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
    String();
    String(const char *v);
    String(std::string &v);
    String(const String &v);
    String &operator=(const char *v);
    String &operator=(Boolean v);
    String &operator=(Number v);
    String &operator=(IObject *v);
    String &operator=(Int32 v);
    String &operator=(Uint32 v);
    String &operator=(Int64 v);
    String &operator=(Uint64 v);
    String operator+(const char *b);
    String operator+(const String &b);
    String operator+(Int32 b);
    String operator+(Int64 b);
    String operator+(Uint32 b);
    String operator+(Uint64 b);
};

class _Closure : public Object
{
  public:
    _Closure();
    _Closure(Func func);
    virtual ~_Closure();
    virtual Any get(const char *name);
    virtual void set(const char *name, Any value);
    virtual Func func();

  protected:
    Func _func;
    std::map<std::string, Any> _locals;
};

template <typename TKey, typename TValue>
class Map : public Object
{
  public:
    Map() {}
    Map(const Map &v)
    {
        _objects = v._objects;
    }
    TValue &operator[](TKey key)
    {
        return _objects[key];
    }
    Map &operator=(const Map &v)
    {
        _objects = v._objects;
        return *this;
    }

  protected:
    std::map<TKey, TValue> _objects;
};

template <typename TValue>
class Array : public Object
{
  public:
    Array() {}
    Array(const Array &v)
    {
        _objects = v->_objects;
    }
    TValue &operator[](int key)
    {
        return _objects[key];
    }
    Array &operator=(const Array &v)
    {
        _objects = v->_objects;
        return *this;
    }
    virtual int length() {
        return _objects.size();
    }
  protected:
    std::vector<TValue> _objects;
};

enum Type
{
    TypeNil,
    TypeString,
    TypeNumber,
    TypeBoolean,
    TypeFunction,
    TypeObject,
    TypeInt32,
    TypeInt64,
    TypeUint32,
    TypeUint64
};

class Any
{
  public:
    Any();
    Any(const Any &v);
    Any(const String &v);
    Any(const char *v);
    Any(Int32 v);
    Any(Int64 v);
    Any(Uint32 v);
    Any(Uint64 v);
    Any(Number v);
    Any(Boolean v);
    Any(IObject *v);
    Any(_Closure *v);

    virtual void retain();
    virtual void release();

    virtual Any &operator=(kk::String &v);

    virtual operator kk::Int();
    virtual operator kk::Uint();
    virtual operator kk::Int64();
    virtual operator kk::Uint64();
    virtual operator kk::Number();
    virtual operator kk::Boolean();
    virtual operator kk::String();
    virtual operator IObject *();
    virtual operator _Closure *();

    template <typename T, typename... TArg>
    T operator()(TArg... arg)
    {
        if (_type == TypeFunction && _functionValue != nullptr)
        {
            T((*fn)(_Closure *, TArg...)) = (T(*)(_Closure *, TArg...))_functionValue->func();
            if (fn != nullptr)
            {
                return (*fn)(_functionValue, arg...);
            }
        }
        return (T) nullptr;
    }

    static Any Nil;

  protected:
    Type _type;
    String _stringValue;
    union {
        IObject *_objectValue;
        _Closure *_functionValue;
        Number _numberValue;
        Boolean _booleanValue;
        Int32 _int32Value;
        Uint32 _uint32Value;
        Int64 _int64Value;
        Uint64 _uint64Value;
    };
};

template <typename T, typename... TArg>
class Closure : public _Closure
{
  public:
    Closure() : _Closure() {}
    Closure(T (*func)(_Closure *, TArg...)) : _Closure((Func)func) {}
    Closure(const Closure &v)
    {
        _func = v._func;
        _locals = v._locals;
    }
    Closure *as(const char *key, Any value)
    {
        _locals[key] = value;
        return this;
    }
    T operator()(TArg... arg)
    {
        T((*fn)(_Closure *, TArg...)) = (T(*)(_Closure *, TArg...))_func;
        if (fn != nullptr)
        {
            return (*fn)((_Closure *)this, arg...);
        }
        return (T) nullptr;
    }
    bool operator!=(void *v)
    {
        return _func == v;
    }
};

template <class T = IObject>
class Strong : public _Strong
{
  public:
    Strong() : _Strong() {}
    Strong(T object) : _Strong(object) {}
    Strong(const Strong &ref) : _Strong(ref.get()) {}
    T as()
    {
        return (T)get();
    }
    Strong &operator=(T object)
    {
        set((IObject *)object);
        return *this;
    }
    Strong &operator=(Strong &ref)
    {
        set(ref.get());
        return *this;
    }
    operator T()
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
        set((kk::IObject *)object);
        return *this;
    }
    virtual Weak &operator=(Weak &ref)
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
